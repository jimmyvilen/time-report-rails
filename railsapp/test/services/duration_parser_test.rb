require "test_helper"

class DurationParserTest < ActiveSupport::TestCase
  test "rejects junk between duration parts" do
    assert_nil DurationParser.parse("1h x 30m")
  end

  test "rejects junk before a duration" do
    assert_nil DurationParser.parse("abc 30m")
  end

  test "accepts valid composite durations" do
    assert_equal 90, DurationParser.parse("1h 30m")
  end
end
